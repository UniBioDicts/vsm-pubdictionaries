---
title: 'Linking PubDictionaries with UniBioDicts to support Community Curation'
tags:
  - dictionary search
  - biocuration
  - curation tools
  - rest api
  - public dictionaries
  - knowledge annotation
  - semantic web
authors:
  - name: John Zobolas
    orcid: 0000-0002-3609-8674
    affiliation: '1, *'
  - name: Jin-Dong Kim
    orcid: 0000-0002-8877-3248
    affiliation: '2, *'
  - name: Martin Kuiper
    orcid: 0000-0002-1171-9876
    affiliation: 1
  - name: Steven Vercruysse
    orcid: 0000-0002-3136-7353
    affiliation: 1
affiliations:
  - name: Department of Biology, Norwegian University of Science and Technology (NTNU), Trondheim, Norway
    index: 1
  - name: Database Center for Life Science (DBCLS), Tokyo, Japan
    index: 2
  - name: Authors share senior authorship
    index: '*'
date: 15 December 2020
bibliography: paper.bib
event: BH20EU
authors_short: John Zobolas & Jin-Dong Kim \emph{et al.}
---

# Abstract

Curators of biological information face many challenges, mainly attributed to the increasing discovery rate of new knowledge as well as the continuous refactoring of data formats, ontologies and controlled vocabularies.
To help biocurators annotate new information that does not fit the current status quo, we present an update of **PubDictionaries**, a public resource of simple-structured dictionaries with a dedicated REST API for accessing the stored terms and identifiers.
This public resource of dictionaries, combined with a new software client that connects it to the **Unified Biological Dictionaries (UBDs)** and their underlying uniform data format, enables the efficient search and retrieval of ad hoc created terms along with the easy integration to tools that will further support the curators specific annotation tasks.
A demo example using the Visual Syntax Method (VSM) technology combined with the PubDictionaries-empowered UBD, demonstrates how effortless it is to incorporate our implemented approach into a general-purpose knowledge annotation tool, making the curator’s job significantly easier.

# Introduction

The curation of biological information is met with several challenges today. 
The constant refactoring of ontologies, nomenclature and identifiers, as well as the discovery of new information, makes the life of knowledge curators difficult, especially in the highly diverse biology domain.
For example, expert curators who use software tools to help them with the annotation process, might come across a new feature or functionality that does not exist within an ontology or data resource that their annotation tool connects to.
Similar difficulties are faced by biologists who want to quickly curate papers and set up a project-specific knowledge resource: unfamiliarity with existing terms and term resources may lead to errors in the annotation process, or the ‘invention’ of new terms that may be difficult to reconcile with other resources.

Although there is an abundance of resources available for controlled vocabularies, ontologies and identifiers, it may still be challenging to gather all the necessary resources for broad or dedicated annotation endeavours.
Alternatively, in cases where no proper controlled vocabulary would exist, term suggestions and all the work that goes into creating new vocabularies will remain largely isolated from general use, if no term sharing mechanism is available.
The **Unified Biological Dictionaries** (**UniBioDicts** or **UBDs**) [@UBDs] is a set of software packages that offers a new, single access point solution, available to be plugged into any curation platform currently in operation (for an example curation technology that is coupled out-of-the-box with UBDs, see the Visual Syntax Method or VSM [@vsm-paper]).
On the other hand, **PubDictionaries** [@Kim2019] is a public repository of dictionaries where users can create their own dictionaries based on a simple data format consisting of a term and an identifier.

During the ELIXIR BioHackathon 2020, we worked on updating and improving the PubDictionaries API as well as implementing a new UBD client that directly communicates with that API, completing thus the unification and connection of the most important data resources across all biological domains.
Moreover, the addition of PubDictionaries in the UniBioDicts software list, provides a synchronisation method for all the public term resources contained in PubDictionaries, enabling thus the easier integration of these dictionaries to any curation tool that may have a need for their terms.

# Results

In the following two subsections, we briefly summarise the results of the work that was done during the ELIXIR BioHackathon 2020.
The results are splitted into two categories:

- Updating the PubDictionaries REST API
- Creating a new UBD client library to access the above API

## PubDictionaries REST API

PubDictionaries is a public repository of dictionaries, where each dictionary is a collection of **labels** (human-friendly **terms**) + **identifiers** (unambiguous **IDs**, used by computers), jointly called **entries**.
A user can create their own dictionaries and add entries to it via the web-interface.
The dictionaries can be used to annotate any piece of text via the PubAnnotation ecosystem [@Kim2019] or to lookup terms, and both these services are supported by a RESTful API [@pubdict-doc].
All the API responses are structured as JSON objects.
Up until the BioHackathon event, the REST service endpoints were as follows:

1. `find_ids`: given a specific term and some dictionary names, this endpoint returns the corresponding IDs that exactly match the term in these dictionaries.
Example: https://pubdictionaries.org/find_ids.json?labels=TP53&dictionaries=human-UniProt
2. `prefix_completion`/`substring_completion`: given a term, these endpoints search for prefix (resp. substring) matches in a specified dictionary and return the corresponding entries.
Note that always the first page of results was returned and at most 15 entries.
Example: https://pubdictionaries.org/dictionaries/human-UniProt/prefix_completion?term=p53

The following REST Service endpoints were added during the bioHackathon:

1. A dictionary-specific endpoint that returns information about a specific dictionary, such as its id, name, a text description, the number of entries it has, etc. 
Example: https://pubdictionaries.org/dictionaries/human-UniProt.json, where `human-UniProt` can be any existing dictionary name.
2. `entries` endpoint: returns all entries of a specific dictionary paginated, sorted by label.
Example: https://pubdictionaries.org/dictionaries/human-UniProt/entries.json?page=1&per_page=15.
Note that the user can explicitly specify the number of pages to split the entries of a dictionary and the exact page he wants to get the results back from.
3. `find_terms` endpoint: this is the complement of the `find_ids` endpoint in the sense that it returns a list of terms and dictionary names that match the given IDs, first sorted by ID and then by the dictionary name.
If no dictionary name is given, then this endpoint searches for the given IDs in all dictionaries.
Example: https://pubdictionaries.org/find_terms.json?dictionaries=&ids=https://www.uniprot.org/uniprot/P04637
4. `mixed_completion` endpoint: a combined and updated version of the `prefix_completion` and `substring_completion` endpoints.
For a given term and specified dictionary, it returns a list of entries, putting the prefix completions in the top half and the substring completions in the bottom half, while pruning any possible common entries.
In addition, this endpoint supports pagination which is a direct result of extending the prefix and substring endpoints to support this feature as well.
Example: https://pubdictionaries.org/dictionaries/human-UniProt/mixed_completion?term=p53&page=2&per_page=3

Additional work on the PubDictionaries server-side included the support of create and delete operations of a specific dictionary, given certified user credentials.
We show an example of each in the next code blocks, using the standard `curl` Linux command:

```
curl -i -u username:password -H "content-type:application/json" -d 
'{"name":"my_new_dict", "description":"A newly created public dictionary", 
"public":true}' "https://pubdictionaries.org/dictionaries.json"
```

```
curl -XDELETE -u 'username:password' 
"https://pubdictionaries.org/dictionaries/my_new_dict.json"
```

Lastly, the error handling was harmonized across all REST URL endpoints.
In particular, when a user searches for a non-existent dictionary name, the PubDictionaries server returns a proper JSON-formatted response as follows: `{ "message": "Unknown dictionary: <name>." }`.
For example, all the following URL links return such a response object:

- https://pubdictionaries.org/dictionaries/non-existent-dictionary-name.json
- https://pubdictionaries.org/find_terms.json?dictionaries=non-existent-dictionary-name&ids=id1,id2
- https://pubdictionaries.org/dictionaries/non-existent-dictionary-name/entries.json

## PubDictionaries UBD Client

UBDs are a set of software packages that provide a unified query-interface for accessing the online API services of key biological data providers [@UBDs].
The main feature of UBDs is their string-search functionality, which returns for a given label a list of matching terms, identifiers and metadata units from databases (e.g. UniProt [@TheUniProtConsortium2019]), controlled vocabularies (e.g. PSI-MI), and ontologies (e.g. GO, via BioPortal [@Whetzel2011]).
This feature makes UBDs ideal for enabling autocomplete support in user-interface components that serve terms to curators from disparate resources, allowing thus the more efficient annotation of information.

Part of our work in the ELIXIR BioHackathon 2020 included the creation of a [new UBD client](https://github.com/UniBioDicts/vsm-pubdictionaries) that utilizes the updated PubDictionaries API in order to solve a long-standing problem in the biocurator community: how can ad hoc, project-specific terms and in general new information be effectively annotated and served via a curation platform, without the need to first negotiate the storage, update and reconciliation of that information with a third party, e.g. a database or ontology provider?
Our client software addresses this problem by presenting a mediator solution that can easily be plugged in current curation applications and serve ad hoc terms from public curator-created dictionaries.

Regarding the software client code, we wrote [extensive documentation](https://github.com/UniBioDicts/vsm-pubdictionaries) to delineate the mapping between the terms and IDs from PubDictionaries and the unified UBD format and how this is achieved via the updated PubDictionaries REST API endpoints, all in accordance with the parent [dictionary interface specification](https://github.com/vsm/vsm-dictionary/blob/master/Dictionary.spec.md).
We also took the extra time to enable automatic integration support via [travis](https://travis-ci.com/github/UniBioDicts/vsm-pubdictionaries) and write extensive tests ([code coverage](https://codecov.io/gh/UniBioDicts/vsm-pubdictionaries) is at 95%), so as to deliver more reliable, fault-tolerant and easy-to-extend software.
Moreover, the documentation includes two examples; one showcasing the search term functionality via `node.js` and one indicating how to use the client library directly from an HTML file.
Finally, the [demo example](https://github.com/UniBioDicts/vsm-pubdictionaries/blob/master/test/test_vsm_box_pubdictionaries.html) that was presented during the last report session of the bioHackathon, demonstrates a simple use-case where a few public dictionaries were created and their terms served in a vsm-box curation interface [@vsm-box].
Thus we display how effortless the annotation of new information can be, by means of the autocomplete functionality of the provided curation tool, as well as how this new knowledge can be connected with semantically aware annotations.

# Discussion

The advantages of a software package that connects with and queries any dictionary created in the PubDictionaries web interface are multiple.
Such a novel software enables annotation tools to use a common language and interface to link to information that might take time to be inserted into standard databases.
It thus positions PubDictionaries firmly in the mainstream of controlled vocabularies (CVs) and ontology resources, filling a niche of new and ad hoc CVs that in turn may prompt new dedicated efforts to mature these CVs for consensus and expert maintenance.

Being part of an ELIXIR bioHackathon event, our project coincides with the goals of several of ELIXIR’s activities, or so-called ‘Platforms’.
In the ELIXIR Data Platform, the drive to use, re-use and value life science data takes precedence and our efforts exemplify how to achieve this by providing a scalable solution for curation platforms, especially the ones that include the support of annotation efforts on new information types.
Furthermore, our main objective matches the goals of the ELIXIR Interoperability Platform: we offer a way to publicly-access and integrate new curated knowledge in a unified form, which enables new knowledge to be used by humans and machines alike to build knowledge systems that will aid future endeavors in understanding biological processes.

# Future Work

Our future work includes updates on the PubDictionaries API to support the addition, update and deletion of dictionary entries, which is a functionality currently only available in the web-interface of PubDictionaries.
Consequently, a further update on the UBD client will provide the necessary backbone to help build user interfaces, where curators won’t even need to log into the PubDictionaries website to create new dictionaries, and add, update or delete entries, but rather they will be able to do that in their own in-house curation tool.
This functionality is currently not offered by any biological data provider.
Lastly, we expect that these updates, coupled with the search-string functionality provided by the PubDictionaries UBD client, will significantly increase the autonomy of the biocurators and their potential for information annotation.

# Links to software and documentation

- PubDictionaries API documentation: https://docs.pubdictionaries.org
- PubDictionaries source code: https://github.com/pubannotation/pubdictionaries
- PubDictionaries UBD Client: https://github.com/UniBioDicts/vsm-pubdictionaries
- Demo example with vsm-box: https://github.com/UniBioDicts/vsm-pubdictionaries/blob/master/test/test_vsm_box_pubdictionaries.html

# Acknowledgements

This work was done during the virtual Europe BioHackathon event that was organized by ELIXIR in November 2020. 
We would like to thank the organizers for the excellent management of such a large scale virtual event with over 200+ participants and for the opportunity to meet, discuss, collaborate and share ideas and technologies with other people, that would be otherwise impossible.

# References
